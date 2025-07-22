defmodule LocStream.LocationsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `LocStream.Locations` context.
  """


  def rand_latitude, do: :rand.uniform() * 180 - 90
  def rand_longitude, do: :rand.uniform() * 360 - 180
  def rand_point, do: %Geo.Point{coordinates: {rand_longitude(), rand_latitude()}, srid: 4326}
  def unique_client_id, do: Ecto.UUID.generate()

  def valid_location_update_attribute(attrs \\ %{}, user) do
    Enum.into(attrs, %{
      user_id: user.id,
      longitude: rand_longitude(),
      latitude: rand_latitude(),
      client_id: unique_client_id(),
      recorded_at: DateTime.utc_now()
    })
  end

  @doc """
  Generate a location_update.
  """
  def location_update_fixture(attrs \\ %{}, user) do
    {:ok, location_update} =
      attrs
      |> valid_location_update_attribute(user)
      |> LocStream.Locations.create_location_update()
    location_update
  end
end
