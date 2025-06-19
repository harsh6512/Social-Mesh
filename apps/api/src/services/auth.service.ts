import crypto from "crypto"

const generateOTP = (): string => {
  const buffer = crypto.randomBytes(3);
  const otpNum = buffer.readUIntBE(0, 3) % 1000000;
  return otpNum.toString().padStart(6, "0");
};

export {
    generateOTP
}