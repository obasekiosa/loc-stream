defmodule LocStream.Locations.LocationUpdate do
  use Ecto.Schema
  import Ecto.Changeset
  alias LocStream.Locations.LocationUpdate
  alias LocStream.Accounts
  alias Geo.Point

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "location_updates" do

    field :location, Geo.PostGIS.Geometry
    field :recorded_at, :utc_datetime_usec
    field :client_id, :string
    field :longitude, :float, virtual: true
    field :latitude, :float, virtual: true
    belongs_to :user, Accounts.User

    timestamps(type: :utc_datetime_usec)
  end

  @doc """
  Creates a changeset for a location update.
  """
  def changeset(location_update, attrs) do
    location_update
    |> cast(attrs, [:user_id, :longitude, :latitude, :client_id, :recorded_at])
    |> validate_required([:user_id, :longitude, :latitude, :client_id, :recorded_at])
    |> validate_number(:latitude, greater_than_or_equal_to: -90.0, less_than_or_equal_to: 90.0)
    |> validate_number(:longitude, greater_than_or_equal_to: -180.0, less_than_or_equal_to: 180.0)
    |> put_location_change()
    |> validate_change(:recorded_at, fn :recorded_at, recorded_at ->
      now = DateTime.utc_now()
      if DateTime.after?(recorded_at, now) do
        [recorded_at: "recorded_at: #{recorded_at} can not be after current time: #{now}"]
      else
        []
      end
    end)
  end

  def put_location_change(%Ecto.Changeset{changes: %{longitude: long, latitude: lat}}=changeset) do
    put_change(changeset, :location, build_location_point(long, lat))
  end

  def put_location_change(changeset), do: changeset

   @doc """
  Creates a changeset for batch inserts.
  This is a simplified changeset as `insert_all` doesn't use `cast` or `validate_required` directly.
  It's more for documentation of expected fields.
  """
  def batch_changeset(attrs) do
    attrs
    |> Enum.map(fn attr ->
      {status, result} = changeset(%LocationUpdate{}, attr) |> apply_action(:validate)
      attr = case status do
        :ok -> Map.put(attr, "location", result.location)
        :error -> Map.put(attr, "errors", result.errors)
      end
      {status, attr}
    end)
    |> Enum.group_by(fn {status, _} -> status end, fn {_, attr} -> attr end)
    |> then(fn group_map ->
      ok_values = Map.get(group_map, :ok)
      err_values = Map.get(group_map, :error)

      {ok_values || [], err_values || []}

      # ok_attr = if ok_values == nil do
      #   []
      # else
      #   ok_values |> Enum.map(fn {_, _, attr} -> attr end)
      # end

      # err_attr = if err_values == nil do
      #   []
      # else
      #   err_values |> Enum.map(fn {_, _, attr} -> attr end)
      # end
      # {ok_attr, err_attr}
    end)
  end

  @doc """
  Helper to build a Geo.Point struct from separate lat/lon fields for convenience.
  Useful if client sends lat/lon separately.
  """
  def build_location_point(longitude, latitude) do
    %Point{
      coordinates: {longitude, latitude}, # Geo.Point expects [longitude, latitude]
      srid: 4326 # WGS84 SRID for GPS coordinates
    }
  end

  def build_location_point(%{longitude: long, latitude: lat}), do: build_location_point(long, lat)

  def populate_virtual_fields(%__MODULE__{}=value) do
    {long, lat} = value.location.coordinates
    %__MODULE__{value | longitude: long, latitude: lat}
  end
  def populate_virtual_fields(nil), do: nil
  def populate_virtual_fields({:ok, value}), do: {:ok, populate_virtual_fields(value)}
  def populate_virtual_fields({:error, _}=value), do: value

  def to_json(%__MODULE__{}=value) do
    Map.take(value, [:client_id, :id, :longitude, :latitude, :recorded_at, :user_id, :inserted_at, :updated_at])
    |> Enum.map(fn {k, v} -> {Atom.to_string(k), v} end)
    |> Enum.into(%{})
  end
end
