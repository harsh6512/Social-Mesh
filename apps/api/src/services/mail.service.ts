import { transporter } from "../lib/nodemailer.js"
import {ENV} from "../constants/env.js"

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