import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Not required for Google-OAuth-only accounts.
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      select: false,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ['client', 'freelancer', 'admin'],
      required: true,
      default: 'client',
    },
    phone: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },

    // GeoJSON point — required for the "hyperlocal" side of the product
    // (location-based search / matching, Week 2).
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
      city: { type: String, default: '', trim: true },
      address: { type: String, default: '', trim: true },
    },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    googleId: { type: String, select: false, index: true, sparse: true },

    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },

    refreshTokenHash: { type: String, select: false },

    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String, default: '' },

    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// Strips every field that should never leave the server, even by accident.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.emailVerificationTokenHash;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  delete obj.twoFactorSecret;
  delete obj.refreshTokenHash;
  delete obj.googleId;
  return obj;
};

export default mongoose.model('User', userSchema);
