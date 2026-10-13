export abstract class Entity<Props> {
  protected readonly _id: string;
  protected readonly props: Props;

  protected constructor(props: Props, id: string) {
    this._id = id;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  equals(other?: Entity<Props>): boolean {
    if (other == null) return false;
    if (this === other) return true;
    return this._id === other._id;
  }
}
