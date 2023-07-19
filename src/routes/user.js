const express = require('express')
const router = express.Router()
const { v4 } = require('uuid');

const authController = require('../controllers/authControllers')
const {login_get ,signup_post,signup_get ,emailVerify_get ,login_post ,logout_get ,groupCreate_get,groupCreate_post ,groupInfo_get , groupInfo_post ,groupInfoEqual_post ,remainder_get,about, groupUnEqualCsv_get,groupEqualCsv_get} = require('../controllers/authControllers')
console.log(signup_post,"kkkkkk");
const { requireAuth, redirectIfLoggedIn } = require('../middleware/userAuth')
router.get('/verify/:id', emailVerify_get)
router.get('/signup',redirectIfLoggedIn, signup_get)
router.post('/signup', signup_post)
router.get('/login', redirectIfLoggedIn, login_get)
router.post('/login',login_post)
router.get('/logout', requireAuth, logout_get)

//group

router.get('/group', requireAuth, groupCreate_get)
router.post('/group', requireAuth, groupCreate_post)
router.post('/about', about)


router.post('/groupInfoEqual/:id', requireAuth, groupInfoEqual_post)
router.get('/groupInfo/:id', requireAuth, groupInfo_get)
router.post('/groupInfo/:id', requireAuth, groupInfo_post)//group id
//csv
router.get('/groupUnEqualCsv/:id', requireAuth, groupUnEqualCsv_get)
router.get('/groupEqualCsv/:id', requireAuth, groupEqualCsv_get)

//remainder
router.get('/reminder/:amount/:email/:id', requireAuth, remainder_get)

module.exports = router