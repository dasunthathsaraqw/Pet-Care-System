import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      maxlength: [100, 'Email cannot exceed 100 characters'],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, 'Password must be at least 8 characters long'],
      validate: { // FIX 5.3
        validator: function (v) { // FIX 5.3
          if (!v || v.startsWith('$2a$') || v.startsWith('$2b$') || v.startsWith('$2y$')) return true; // FIX 5.3
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(v); // FIX 5.3
        }, // FIX 5.3
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one digit', // FIX 5.3
      }, // FIX 5.3
    },
    role: {
      type: String,
      enum: ['user_admin', 'event_manager', 'adoption_manager', 'appointment_manager', 'store_manager'],
      required: true,
    },
  },
  { timestamps: true }
);

// Normalize role to lowercase before saving
adminSchema.pre('save', function (next) {
  if (this.isModified('role')) {
    this.role = this.role.toLowerCase();
  }
  next();
});

// Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hash');
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log('Password hashed successfully:', this.password);
    next();
  } catch (err) {
    console.error(`Error hashing password for admin ${this.email}:`, err);
    next(err); // Pass error to Mongoose
  }
});

// Match entered password with hashed password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error(`Error comparing password for admin ${this.email}:`, err);
    throw err;
  }
};

// Index for frequent queries
adminSchema.index({ role: 1 });

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;