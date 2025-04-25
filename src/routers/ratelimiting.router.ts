import {
    addUserRateLimiting,
    getUserRateLimiting,
    modifyUserRateLimiting,
    deleteUserRateLimiting,
    getUserFile
} from '../controllers/ratelimiting.controller'
import auth from '../middelwares/auth.middelware'
import { Router } from 'express'


const router = Router()

router.post('/add', auth, addUserRateLimiting)
router.post('/get', auth, getUserRateLimiting)
router.post('/delete', auth, deleteUserRateLimiting)
router.post('/modify', auth, modifyUserRateLimiting)
router.post('/getfile', auth, getUserFile)


export default router

