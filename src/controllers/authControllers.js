// const express=require('express')
// const app=express();
// app.use(express.json)
const User = require('../models/User')
const Group = require('../models/Group')
const GU = require('../models/GU')
const jwt = require('jsonwebtoken')
const { signupMail,reminderMail } = require('../config/nodemailer')
const path = require('path')
const { handleErrors } = require('../utilities/Utilities'); 
const crypto = require('crypto')
require('dotenv').config()
const { nanoId } = require("nanoid")
const mongoose=require('mongoose')
const {Parser} = require('json2csv');
const maxAge = 30 * 24 * 60 * 60

// controller actions

const login_get = (req, res) => {
    res.send('login')
}

const signup_post = async (req, res) => {
    // console.log(req.body);
    const { name, email,  password, confirmPwd } = req.body;
     console.log("in sign up route",{  name, email,  password, confirmPwd });
    if (password != confirmPwd) {
        req.flash('error_msg', 'Passwords do not match. Try again')
        res.status(400).redirect('/')
        return
    }

    try {
        const userExists = await User.findOne({ email })
        if (userExists) {
            console.log('iffffff');
            req.flash(
                'success_msg',
                'This email is already registered. Try logging in'
            )
            return res.redirect('/')
        }
        console.log("ytyub");
        const user = await User.create({ email, name, password})
        // let saveUser = await user.save()
         console.log(user);
        req.flash(
            'success_msg',
            'Registration successful. Check your inbox to verify your email'
        )
        console.log('a');
        // console.log({
        //     saveUser, hostname:req.hostname, protocol:req.protocol
        // });
        signupMail(user, req.hostname, req.protocol)
        console.log('b');
        // res.send(saveUser)
        res.redirect('/')
    } catch (err) {
        const errors = handleErrors(err)
        // console.log(errors)

        var message = 'Could not signup. '.concat((errors['email'] || ""), (errors['password'] || ""),(errors['name'] || "")  )
        //res.json(errors);
        req.flash(
            'error_msg',
            message
        )
        res.status(400).redirect('/user/signup')
    }
}

const signup_get = (req, res) => {
    res.send('signup')
    console.log(req.body,'aeryasyhb');
    signup_post(req.body);
}



const emailVerify_get = async (req, res) => {
    try {
        const userID = req.params.id
        const expiredTokenUser = await User.findOne({ _id: userID })
        const token = req.query.tkn
        // console.log(token)
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                req.flash(
                    'error_msg',
                    ' Your verify link had expired. We have sent you another verification link'
                )
                signupMail(expiredTokenUser, req.hostname, req.protocol)
                return res.redirect('/')
            }
            const user = await User.findOne({ _id: decoded.id })
            if (!user) {
                // console.log('user not found')
                res.redirect('/')
            } else {
                const activeUser = await User.findByIdAndUpdate(user._id, {
                    active: true,
                })
                if (!activeUser) {
                    // console.log('Error occured while verifying')
                    req.flash('error_msg', 'Error occured while verifying')
                    res.redirect('/')
                } else {
                    req.flash(
                        'success_msg',
                        'User has been verified and can login now'
                    )
                    // console.log('The user has been verified.')
                    // console.log('active', activeUser)
                    res.redirect('/')
                }
            }
        })
    } catch (e) {
        // console.log(e)
        //signupMail(user,req.hostname,req.protocol)
        res.redirect('/')
    }
}

const login_post = async (req, res) => {
    const { email, password } = req.body
     console.log('in Login route')
     console.log('req.body',req.body)
    try {

        const user = await User.login(email, password)
        // console.log("user",user)

        const userExists = await User.findOne({ email })  
    //    console.log("userexsits",userExists)
       console.log(userExists,' userrrrr');
        if (!userExists.active) {
            const currDate = new Date();
            const initialUpdatedAt = userExists.updatedAt;
            const timeDiff = Math.abs(currDate.getTime() - initialUpdatedAt.getTime());
            if(timeDiff<=10800000)
            {
                // console.log("Email already sent check it")
                req.flash(
                    'error_msg',
                    `${userExists.name}, we have already sent you a verify link please check your email`)
                res.redirect('/')
                return
            }
            req.flash(
                'success_msg',
                `${userExists.name}, your verify link has expired we have sent you another email please check you mailbox`
            )
            signupMail(userExists, req.hostname, req.protocol)
            await User.findByIdAndUpdate(userExists._id, { updatedAt: new Date() });
            // console.log('userExists',userExists)
            res.redirect('/')
            return
        }
       
        const token = user.generateAuthToken(maxAge)

        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 })
        // console.log(user);
        //signupMail(saveUser)
    //    console.log("logged in")
        req.flash('success_msg', 'Successfully logged in')
        res.status(200).redirect('/')
    } catch (err) {
        req.flash('error_msg', 'Invalid Credentials')
        // console.log(err)
        res.redirect('/')
    }
}

const logout_get = async (req, res) => {
    // res.cookie('jwt', '', { maxAge: 1 });
    // const cookie = req.cookies.jwt
    res.clearCookie('jwt')
    req.flash('success_msg', 'Successfully logged out')
    res.redirect('/')
} 

const groupCreate_get = async (req, res) => {
    const user = await req.user.populate('group').execPopulate()
    const allGroups=user.group
    res.render('./group',{
        allGroups
    })
}
const groupCreate_post = async (req, res) => {
    try{
        const {name}=req.body
        console.log(name)
    const userId=[req.user._id]
    const newGroup=new Group({ name,user:userId})
    let saveGroup = await newGroup.save()
    const userGroups=req.user.group
    userGroups.push(saveGroup._id)
    await User.findOneAndUpdate({_id: req.user._id}, {$set:{group:userGroups}}, {new: true}, (err, doc) => {
        if (err) {
            // console.log("Something wrong when updating data!");
            req.flash("error_msg", "Something wrong when updating data!")
            res.redirect('/')
        }
        
        // console.log(doc);
    });
    res.redirect('/user/group')
    }catch(err){
        res.send(err)
    }
}

const groupInfo_get = async(req, res) => {
    //617c4cc6f9150521404c9d09
    try{
        const id=req.params.id
        const groupInfo=await Group.findOne({_id:id})
        // const group = await groupInfo.populate('user').execPopulate()
        const rel=await GU.find({group:id})
        //res.send(relation)
        // console.log(rel)
        var relation=[]
        for(var i=0;i<rel.length;i++){
            var r=await rel[i].populate('user').execPopulate()
            relation.push(r)
        }
        // console.log(relation)
        res.render('./groupinfo',
        {
            relation,
            id,
            groupInfo
        })
    }catch(err){
        res.send('err')
    }
}
const groupInfo_post = async(req, res) => {
    //617c4cc6f9150521404c9d09
    try{
        const id=req.params.id
        const {email,amount}=req.body
        console.log(email,amount)
        // console.log(amount)
       if(email===undefined){
        res.redirect(`/user/groupInfo/${id}`)
       }
        const user=await User.findOne({email})
        const group=await Group.findOne({_id:id})
        const users=group.user
        users.push(user._id)
        await Group.findOneAndUpdate({_id: id}, {$set:{user:users}}, {new: true}, (err, doc) => {
            if (err) {
                // console.log("Something wrong when updating data!");
                req.flash("error_msg", "Something wrong when updating data!")
                res.redirect('/')
            }
            
            // console.log(doc);
        });
        const userId=user._id
        const newRelation=new GU({user:userId,group:id,amount})
        const relation=await newRelation.save()
        const relationSend=await relation.populate('user').execPopulate()
        if(amount===undefined){
            var len=group.user.length-1
            var eachHead=(group.amount)/len
            eachHead=eachHead.toFixed(2)
            console.log(len)
            await Group.findOneAndUpdate({_id: id}, {$set:{amount:eachHead}}, {new: true}, (err, doc) => {
                if (err) {
                    // console.log("Something wrong when updating data!");
                    req.flash("error_msg", "Something wrong when updating data!")
                    res.send(err)
                }  
            }); 
        }
        // res.send(relation)
        res.redirect(`/user/groupInfo/${id}`)
    }catch(err){
        res.send(err)
    }
}

const groupInfoEqual_post = async(req, res) =>{
    try{
        const {amount}=req.body
        const id=req.params.id
        const group=await Group.findOne({_id:id})
        console.log(group)
    var len=group.user.length-1
    var eachHead=amount/len
    eachHead=eachHead.toFixed(2)
    console.log(len)
    await Group.findOneAndUpdate({_id: id}, {$set:{amount:eachHead}}, {new: true}, (err, doc) => {
        if (err) {
            // console.log("Something wrong when updating data!");
            req.flash("error_msg", "Something wrong when updating data!")
            res.send(err)
        }
        
        // console.log(doc);
    });
     res.redirect(`/user/groupInfo/${id}`) 
    }catch(err){
        res.send(err)
    }
}

const remainder_get=async(req,res)=>{
    try{
        const amount=req.params.amount
        const email=req.params.email
        const id=req.params.id
        const group=await Group.findOne({_id:id})
        const user=req.user
        reminderMail(group,email,amount,req.hostname,req.protocol)
        console.log(amount,email,id)

        res.redirect(`/user/groupInfo/${id}`)
    }catch(err){
        res.send(err)
    }
}
const about=async(req,res)=>{
        res.send(`/user/about`)
}

const groupUnEqualCsv_get=async(req,res)=>{
    try{
        const id=req.params.id
        const groupInfo=await Group.findOne({_id:id})
        // const group = await groupInfo.populate('user').execPopulate()
        const rel=await GU.find({group:id})
        //res.send(relation)
        // console.log(rel)
        var relation=[]
        for(var i=0;i<rel.length;i++){
            var r=await rel[i].populate('user').execPopulate()
            relation.push({'Name':r.user.name,'Amount':`${r.amount}`})
        }
        const fields = [
            {
              label: 'Name',
              value: 'Name'
            },
            {
              label: 'Amount',
              value: 'Amount'
            }
          ];
          console.log(relation)
          
        const fileName=`${groupInfo.name}.csv`
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(relation);
        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        // res.send(csv);
        console.log(csv)
        return res.send(csv);
        // res.redirect(`/user/groupInfo/${id}`)
    }catch(err){
        res.send(err)
    }
}
const groupEqualCsv_get=async(req,res)=>{
    try{
        const id=req.params.id
        const groupInfo=await Group.findOne({_id:id})
        // const group = await groupInfo.populate('user').execPopulate()
        const rel=await GU.find({group:id})
        //res.send(relation)
        // console.log(rel)
        var relation=[]
        for(var i=0;i<rel.length;i++){
            var r=await rel[i].populate('user').execPopulate()
            relation.push({'Name':r.user.name,'Amount':`${groupInfo.amount}`})
        }
        const fields = [
            {
              label: 'Name',
              value: 'Name'
            },
            {
              label: 'Amount',
              value: 'Amount'
            }
          ];
          console.log(relation)
          
        const fileName=`${groupInfo.name}.csv`
        const json2csv = new Parser({ fields });
        const csv = json2csv.parse(relation);
        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        // res.send(csv);
        console.log(csv)
        return res.send(csv);
        // res.redirect(`/user/groupInfo/${id}`)
    }catch(err){
        res.send(err)
    }
}


module.exports = {login_get ,signup_post,signup_get ,emailVerify_get ,login_post ,logout_get ,groupCreate_get,groupCreate_post ,groupInfo_get ,
    groupInfo_post ,groupInfoEqual_post ,remainder_get,about, groupUnEqualCsv_get,groupEqualCsv_get}
