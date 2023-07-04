import express from 'express'
import { createPost, deletePost, getPost, getTimelinePosts,deleteComment, likePost, updatePost,addComment ,reportPost} from '../controllers/PostController.js'
import authMiddleWare from '../middleware/AuthMiddleware.js'
const router = express.Router()

router.post('/',authMiddleWare,createPost)
router.get('/:id', getPost)
router.put('/:id', updatePost)
router.post('/report',reportPost)
router.delete('/:id', deletePost)
router.delete('/deleteComment/:id', deleteComment)
router.put('/:id/like', likePost)
router.get('/:id/timeline', getTimelinePosts)
router.post('/addComment',addComment)


export default router