defmodule LocStream.Locations.LocationUpdate do
  use Ecto.Schema
  import Ecto.Changeset
  alias LocStream.Locations.LocationUpdate
  alias LocStream.Accounts

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "location_updates" do

    field :latitude, :float
    field :longitude, :float
    field :recorded_at, :utc_datetime_usec
    belongs_to :user, Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  @doc """
  Creates a changeset for a location update.
  """
  def changeset(location_update, attrs) do
    location_update
    |> cast(attrs, [:user_id, :latitude, :longitude, :recorded_at])
    |> validate_required([:user_id, :latitude, :longitude, :recorded_at])
    |> validate_number(:latitude, greater_than_or_equal_to: -90.0, less_than_or_equal_to: 90.0)
    |> validate_number(:longitude, greater_than_or_equal_to: -180.0, less_than_or_equal_to: 180.0)
    |> validate_change(:recorded_at, fn :recorded_at, recorded_at ->
      now = DateTime.utc_now()
      if DateTime.after?(recorded_at, now) do
        [recorded_at: "recorded_at: #{recorded_at} can not be after current time: #{now}"]
      else
        []
      end
    end)
  end

   @doc """
  Creates a changeset for batch inserts.
  This is a simplified changeset as `insert_all` doesn't use `cast` or `validate_required` directly.
  It's more for documentation of expected fields.
  """
  def batch_changeset(attrs) do
    attrs
    |> Enum.map(fn attr ->
      {status, result} = changeset(%LocationUpdate{}, attr) |> apply_action(:validate)
      {status, result, attr}
    end)
    |> Enum.group_by(fn {status, _, _} -> status end)
    |> then(fn group_map ->
      ok_values = Map.get(group_map, :ok)
      err_values = Map.get(group_map, :error)

      ok_attr = if ok_values == nil do
        []
      else
        ok_values |> Enum.map(fn {_, _, attr} -> attr end)
      end

      err_attr = if err_values == nil do
        []
      else
        err_values |> Enum.map(fn {_, _, attr} -> attr end)
      end
      {ok_attr, err_attr}
    end)
  end
end
