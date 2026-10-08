import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { USER_ROLES } from "../constants/index.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false means queries do NOT return the password unless we ask for it
    password: { type: String, required: true, select: false },
    avatar: { type: String, default: "" },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.USER },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash the password every time it is created or changed
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Extra safety: never send the password even if it was loaded
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
