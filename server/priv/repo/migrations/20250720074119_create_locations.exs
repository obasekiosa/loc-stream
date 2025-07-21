defmodule LocStream.Repo.Migrations.CreateLocations do
  use Ecto.Migration

  def change do

    execute "CREATE EXTENSION postgis;"

    create table(:location_updates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id), null: false
      add :client_id, :string, null: false
      add :location, :geometry, null: false
      add :recorded_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec, default: fragment("now()"))
    end

    create index(:location_updates, [:user_id])
    create index(:location_updates, [:user_id, :recorded_at])
    create index(:location_updates, [:location], using: :gist)
  end
end
