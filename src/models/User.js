const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto=require('crypto')
const bcrypt = require('bcryptjs')
const utilities = require('../utilities/Utilities')
const { isEmail } = require('validator')
require('dotenv').config()

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: [true, 'Name field cannot be empty']
        },
        email: {
            type: String,
            trim: true,
            unique: true,
            required: [true, 'Email field cannot be empty'],
            validate: [isEmail, 'Email is invalid'],
        },
        active: {
            type: Boolean,
            default:true,//to be changed to false after testing
        },
        password: {
            type: String,
            trim: true,
            minlength: 8,
            required: [true, 'Password field cannot be empty'],
            validate: [
                (val) => {
                    var strength = utilities.checkPasswordStrength(val)
                    return strength >= 4
                },
                'The password must contain a mix of uppercase and lowercase alphabets along with numbers and special chacracters',
            ],
        },
        phoneNumber: {
            type: String,
            trim: true,
            validate: [utilities.phoneValidator, 'Phone number is invalid'],
        },
        group:[{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Group'

        }],
        
        passwordResetToken: String,
        passwordResetExpires: Date,
    },
    
    {
        timestamps: true,
    },

)
// generate passwordResetToken
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex')
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}

// static method to login user
userSchema.statics.login = async function (email, password) {
    const user = await this.findOne({ email })
    console.log(user,'schema');
    console.log(password,'password');
    //console.log('log',user)
    if (user) {
        const auth = await bcrypt.compare(password, user.password)
        console.log({auth});
        //found bug have to fix the login 
        if (auth) {
            return user
        }
        throw Error('Invalid Credentials')
    }
    throw Error('Invalid Credentials')
}

//creating token for the user
userSchema.methods.generateAuthToken = function generateAuthToken(maxAge) {
    let id = this._id

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge,
    })
}

//deleting the passsword before sending
userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    return userObject
}

//To hash the password
userSchema.pre('save', async function (next) {
    console.log(this.password,'schema');
    const salt = await bcrypt.genSalt()
    this.password = await bcrypt.hash(this.password, salt)
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
