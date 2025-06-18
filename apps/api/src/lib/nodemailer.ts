import nodemailer from 'nodemailer';
import { ENV } from '../constants/env.js';

const transporter=nodemailer.createTransport({
    service:"@gmail",
    auth:{
        user:ENV.EMAIL_USER,
        pass:ENV.EMAIL_PASS,
    },
})

export const sendMail=async(to:string,subject:string,text:string)=>{
    try {
        const info =await transporter.sendMail({
            from: `"Social Mesh" <${ENV.EMAIL_USER}>`,
            to,
            subject,
            text,
        })
         
        return info
    } catch (error) {
        console.error("Failed to send mail: ",error)
    }
}
