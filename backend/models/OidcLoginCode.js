import mongoose from "mongoose";

const oidcLoginCodeSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const OidcLoginCode = mongoose.model("OidcLoginCode", oidcLoginCodeSchema);
export default OidcLoginCode;
