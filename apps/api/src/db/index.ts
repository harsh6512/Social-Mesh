import { PrismaClient } from '../../src/generated/prisma' // Direct path

const prisma=new PrismaClient()

const connectDB=async()=>{
    try{
        await prisma.$connect()
        console.log("Database Connected Successfully");
    }catch(error){
        console.log("Database Connection Failed ",error)
        process.exit(1);
    }
}

export default connectDB;
export {prisma}