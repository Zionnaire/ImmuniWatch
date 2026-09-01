import { Router } from 'express';
import { viewerAuth }     from '../middlewares/viewerAuth';
import * as viewer        from '../controllers/viewerController';

const router = Router();

router.use(viewerAuth);

router.get('/verify',  viewer.verifySummary);
router.get('/summary', viewer.getSummary);

export default router;
