import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address.'],
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
)

// Hash the plaintext password before it's ever persisted. Callers set
// `user.password` (a virtual, never stored) and this hook turns it into
// `passwordHash` — plaintext is never written to the database or logs.
userSchema.virtual('password').set(function setPassword(password) {
  this._password = password
})

userSchema.pre('validate', async function hashPassword() {
  if (!this._password) return

  const salt = await bcrypt.genSalt(11)
  this.passwordHash = await bcrypt.hash(this._password, salt)
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash)
}

// Never leak the hash if a document is ever serialized directly.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash
    delete ret._password
    return ret
  },
})

export const User = mongoose.model('User', userSchema)
