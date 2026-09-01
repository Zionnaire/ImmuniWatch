import { Request, Response, NextFunction } from 'express';
import { Post }           from '../models/Post';
import { Classification } from '../models/Classification';
import { HITLReview }     from '../models/HITLReview';
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

    const [
      totalPosts,
      todayPosts,
      pendingReviews,
      labelCounts,
      platformCounts,
      recentPosts,
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ ingestedAt: { $gte: todayStart } }),
      HITLReview.countDocuments({ status: HITLStatus.PENDING }),

      Classification.aggregate([
        { $group: { _id: '$label', count: { $sum: 1 } } },
      ]),

      Post.aggregate([
        { $group: { _id: '$platform', count: { $sum: 1 } } },
        { $sort: { count: -1 as -1 } },
      ]),

      Post.aggregate([
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
            content:    { $substr: ['$content', 0, 200] },
            platform:   1,
            language:   1,
            ingestedAt: 1,
            label:      { $ifNull: [{ $arrayElemAt: ['$cls.label', 0] }, 'pending'] },
            confidence: { $ifNull: [{ $arrayElemAt: ['$cls.confidence', 0] }, 0] },
          },
        },
      ]),
    ]);

    // ── Misinformation rate ───────────────────────────────────────────────────

    const totalClassified = (labelCounts as { _id: string; count: number }[])
      .reduce((s, r) => s + r.count, 0);
    const misinfoCount = (labelCounts as { _id: string; count: number }[])
      .find((r) => r._id === 'misinformation')?.count ?? 0;
    const misinfoRate = totalClassified > 0
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

    const last = (platform: PostPlatform) =>
      Post.findOne({ platform }).sort({ ingestedAt: -1 }).select('ingestedAt').lean();

    const epm = (platform: PostPlatform) =>
      Post.countDocuments({ platform, ingestedAt: { $gte: oneMinAgo } });

    const platforms: PostPlatform[] = [
      PostPlatform.YOUTUBE, PostPlatform.BLUESKY, PostPlatform.TWITTER,
      PostPlatform.FACEBOOK, PostPlatform.INSTAGRAM, PostPlatform.SUBMISSION,
    ];

    const connectorData = await Promise.all(
      platforms.map(async (p) => {
        const [status, lastDoc, eventsPerMin] = await Promise.all([
          connectorStatus(p), last(p), epm(p),
        ]);
        return {
          platform:     p,
          status,
          eventsPerMin,
          lastEventAt:  lastDoc ? (lastDoc as { ingestedAt: Date }).ingestedAt.toISOString() : '',
        };
      }),
    );

    res.json({
      stats: {
        totalPosts,
        todayPosts,
        pendingReviews,
        misinfoRate,
      },
      labels:    (labelCounts   as { _id: string; count: number }[]).map((r) => ({ label: r._id, count: r.count })),
      platforms: (platformCounts as { _id: string; count: number }[]).map((r) => ({ platform: r._id, count: r.count })),
      recentPosts,
      connectors: connectorData,
    });
  } catch (err) { next(err); }
}
