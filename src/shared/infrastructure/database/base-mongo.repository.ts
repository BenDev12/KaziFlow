import { FilterQuery, Model, UpdateQuery } from 'mongoose';
import { TenantContext } from '../tenancy/tenant-context';

/**
 * `_id` is a domain-generated UUID (string), not a Mongo ObjectId — entity
 * identity is assigned by the domain layer (`randomUUID()` in a use-case)
 * before the entity ever reaches persistence, so entities are always fully
 * formed. Every schema must declare `_id: { type: String }` accordingly.
 */
export interface OrgScopedDocument {
  _id: string;
  orgId: string;
}

/**
 * Every read/write here silently folds in `orgId` from TenantContext and
 * throws TenantContextMissingError (via TenantContext.get()) if no request
 * context is active. Concrete repositories extend this and add only
 * entity-shaped mapping — there is no code path through which a subclass
 * can issue an unscoped query, which is what makes tenant isolation a
 * structural guarantee rather than a per-query convention.
 */
export abstract class BaseMongoRepository<TDocument extends OrgScopedDocument> {
  protected constructor(protected readonly model: Model<TDocument>) {}

  protected scopedFilter(filter: FilterQuery<TDocument> = {}): FilterQuery<TDocument> {
    const { orgId } = TenantContext.get();
    return { ...filter, orgId } as FilterQuery<TDocument>;
  }

  protected async findOneScoped(filter: FilterQuery<TDocument>): Promise<TDocument | null> {
    return this.model.findOne(this.scopedFilter(filter)).exec();
  }

  protected async findManyScoped(
    filter: FilterQuery<TDocument> = {},
    sort?: Record<string, 1 | -1>,
  ): Promise<TDocument[]> {
    const query = this.model.find(this.scopedFilter(filter));
    if (sort) query.sort(sort);
    return query.exec();
  }

  /** `data` must include `_id` — the domain layer assigns identity before persistence. */
  protected async createScoped(data: Partial<TDocument> & { _id: string }): Promise<TDocument> {
    const { orgId } = TenantContext.get();
    const created = new this.model({ ...data, orgId });
    return created.save();
  }

  protected async updateOneScoped(
    filter: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<TDocument | null> {
    return this.model.findOneAndUpdate(this.scopedFilter(filter), update, { new: true }).exec();
  }

  protected async updateManyScoped(
    filter: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ): Promise<void> {
    await this.model.updateMany(this.scopedFilter(filter), update).exec();
  }

  protected async deleteOneScoped(filter: FilterQuery<TDocument>): Promise<boolean> {
    const result = await this.model.deleteOne(this.scopedFilter(filter));
    return result.deletedCount === 1;
  }

  protected async countScoped(filter: FilterQuery<TDocument> = {}): Promise<number> {
    return this.model.countDocuments(this.scopedFilter(filter));
  }
}
