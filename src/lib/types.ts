export type Kind = 'income' | 'expense';
export type Account = {
  id: string;
  user_id: string;
  name: string;
  initial_balance_cents: number;
  reference_date: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: Kind;
  created_at: string;
  updated_at: string;
};
export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  kind: Kind;
  amount_cents: number;
  description: string;
  occurred_on: string;
  commitment_id: string | null;
  created_at: string;
  updated_at: string;
};
export type Commitment = {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string;
  kind: Kind;
  amount_cents: number;
  description: string;
  due_on: string;
  status: 'pending' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
};
export type Profile = {
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};
export type Snapshot = {
  profile: Profile | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  commitments: Commitment[];
};
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, 'user_id' | 'display_name'>;
      accounts: Table<Account, 'user_id' | 'name' | 'initial_balance_cents' | 'reference_date'>;
      categories: Table<Category, 'user_id' | 'name' | 'kind'>;
      transactions: Table<
        Transaction,
        | 'user_id'
        | 'account_id'
        | 'category_id'
        | 'kind'
        | 'amount_cents'
        | 'description'
        | 'occurred_on'
      >;
      commitments: Table<
        Commitment,
        'user_id' | 'category_id' | 'kind' | 'amount_cents' | 'description' | 'due_on'
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_tato_snapshot: { Args: Record<string, never>; Returns: Snapshot };
      initialize_tato: {
        Args: { p_name: string; p_account_name: string; p_balance: number; p_reference: string };
        Returns: string;
      };
      settle_commitment: {
        Args: { p_id: string; p_account_id: string; p_occurred_on: string };
        Returns: string;
      };
      reverse_settlement: { Args: { p_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
