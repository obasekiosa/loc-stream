defmodule LocStream.Repo.Migrations.CreateLocations do
  use Ecto.Migration

  def change do

    # execute "CREATE EXTENSION postgis;"

    create table(:location_updates, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id), null: false
      add :latitude, :float, null: false
      add :longitude, :float, null: false
      add :recorded_at, :utc_datetime_usec, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:location_updates, [:user_id])
    create index(:location_updates, [:user_id, :recorded_at])
  end
end
