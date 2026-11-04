import { Request, Response, NextFunction } from 'express';
import { Post }           from '../models/Post';
import { Classification } from '../models/Classification';
import { HITLReview }     from '../models/HITLReview';
import { Alert }          from '../models/Alert';
import { HITLStatus, PostPlatform } from '../types';

export async function verifySummary(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ valid: true });
  } catch (err) { next(err); }
}

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const oneHourAgo = new Date(Date.now() - 60 * 60_000);
    const twoHrAgo   = new Date(Date.now() - 2 * 60 * 60_000);
    const oneMinAgo  = new Date(Date.now() - 60_000);

    // ── Aggregate stats ───────────────────────────────────────────────────────

    const totalPosts      = await Post.countDocuments();
    const todayPosts      = await Post.countDocuments({ ingestedAt: { $gte: todayStart } });
    const pendingReviews  = await HITLReview.countDocuments({ status: HITLStatus.PENDING });

    const labelCounts = await Classification.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$label', count: { $sum: 1 } } },
    ]);

    const platformCounts = await Post.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 as 1 | -1 } },
    ]);

    const recentPosts = await Post.aggregate([
      { $sort: { ingestedAt: -1 } },
      { $limit: 30 },
      {
        $lookup: {
          from: 'classifications', localField: '_id',
          foreignField: 'postId', as: 'cls',
        },
      },
      {
        $project: {
          _id: 0,
          content:    { $substrCP: ['$content', 0, 200] },
          platform:   1,
          language:   1,
          ingestedAt: 1,
          label:      { $ifNull: [{ $arrayElemAt: ['$cls.label', 0] }, 'pending'] },
          confidence: { $ifNull: [{ $arrayElemAt: ['$cls.confidence', 0] }, 0] },
        },
      },
    ]);

    // ── Misinformation rate ───────────────────────────────────────────────────

    const totalClassified = labelCounts.reduce((s, r) => s + r.count, 0);
    const misinfoCount    = labelCounts.find((r) => r._id === 'misinformation')?.count ?? 0;
    const misinfoRate     = totalClassified > 0
      ? Math.round((misinfoCount / totalClassified) * 1000) / 10
      : 0;

    // ── Connector status (live DB check) ──────────────────────────────────────

    const connectorStatus = async (
      platform: PostPlatform,
    ): Promise<'active' | 'degraded' | 'waiting'> => {
      const inLastHour = await Post.countDocuments({ platform, ingestedAt: { $gte: oneHourAgo } });
      if (inLastHour > 0) return 'active';
      const inLast2h = await Post.countDocuments({ platform, ingestedAt: { $gte: twoHrAgo } });
      if (inLast2h > 0) return 'degraded';
      const anyEver = await Post.exists({ platform });
      return anyEver ? 'degraded' : 'waiting';
    };

    const allPlatforms: PostPlatform[] = [
      PostPlatform.YOUTUBE, PostPlatform.BLUESKY, PostPlatform.TWITTER,
      PostPlatform.FACEBOOK, PostPlatform.INSTAGRAM, PostPlatform.SUBMISSION,
    ];

    const connectorData = await Promise.all(
      allPlatforms.map(async (p) => {
        const [status, lastDoc, eventsPerMin] = await Promise.all([
          connectorStatus(p),
          Post.findOne({ platform: p }).sort({ ingestedAt: -1 }).select('ingestedAt').lean(),
          Post.countDocuments({ platform: p, ingestedAt: { $gte: oneMinAgo } }),
        ]);
        const lastAt = lastDoc?.ingestedAt;
        return {
          platform:     p,
          status,
          eventsPerMin,
          lastEventAt:  lastAt instanceof Date ? lastAt.toISOString() : '',
        };
      }),
    );

    res.json({
      stats: { totalPosts, todayPosts, pendingReviews, misinfoRate },
      labels:      labelCounts.map((r)    => ({ label: r._id, count: r.count })),
      platforms:   platformCounts.map((r) => ({ platform: r._id, count: r.count })),
      recentPosts,
      connectors:  connectorData,
    });
  } catch (err) { next(err); }
}

// ── GET /viewer/posts — paginated posts feed ──────────────────────────────────

export async function getPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 30);
    const skip  = (page - 1) * limit;

    const [total, posts] = await Promise.all([
      Post.countDocuments(),
      Post.aggregate([
        { $sort: { ingestedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $lookup: { from: 'classifications', localField: '_id', foreignField: 'postId', as: 'cls' } },
        {
          $project: {
            content:    { $substrCP: ['$content', 0, 300] },
            platform:   1,
            language:   1,
            ingestedAt: 1,
            externalId: 1,
            label:      { $ifNull: [{ $arrayElemAt: ['$cls.label', 0] }, 'pending'] },
            confidence: { $ifNull: [{ $arrayElemAt: ['$cls.confidence', 0] }, 0] },
          },
        },
      ]),
    ]);

    res.json({ total, page, limit, posts });
  } catch (err) { next(err); }
}

// ── GET /viewer/queue — pending HITL items ────────────────────────────────────

export async function getQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const reviews = await HITLReview.find({ status: HITLStatus.PENDING })
      .sort({ priority: -1, createdAt: 1 })
      .limit(30)
      .populate<{ postId: { content: string; platform: string; language: string; ingestedAt: Date } | null }>(
        'postId', 'content platform language ingestedAt',
      )
      .lean();

    res.json({ reviews });
  } catch (err) { next(err); }
}

// ── GET /viewer/alerts — unresolved alerts ────────────────────────────────────

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const alerts = await Alert.find({ isResolved: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ alerts });
  } catch (err) { next(err); }
}
