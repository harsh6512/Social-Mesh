import bcrypt from "bcrypt";

const hashPassword = async (plainPassword: string): Promise<string> => {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
}

const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

export {
    hashPassword,
    comparePassword,
}