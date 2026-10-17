module {
  /// Identifier for a project record.
  public type ProjectId = Nat;

  /// Identifier for a render record.
  public type RenderId = Nat;

  /// Milliseconds since the Unix epoch.
  public type Timestamp = Nat;

  /// Reference to a file held in platform object storage.
  public type FileRef = Text;
};
