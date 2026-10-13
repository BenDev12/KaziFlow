import { SchemaOptions } from 'mongoose';

/**
 * Shared options for every tenant-scoped Mongoose schema: timestamps, and
 * a toJSON transform that exposes a plain `id` string instead of Mongo's
 * `_id`/`__v` so the interface layer never leans on Mongo-specific shapes.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

/** Every tenant-scoped collection embeds this field definition and indexes it. */
export const orgScopedField = {
  orgId: { type: String, required: true },
} as const;
