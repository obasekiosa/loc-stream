defmodule LocStream.LocationsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `LocStream.Locations` context.
  """


  def rand_latitude, do: :rand.uniform() * 180 - 90
  def rand_logitude, do: :rand.uniform() * 360 - 180

  def validate_location_update_attribute(attrs \\ %{}, user) do
    Enum.into(attrs, %{
      user_id: user.id,
      latitude: rand_latitude(),
      longitude: rand_logitude(),
      recorded_at: DateTime.utc_now()
    })
  end

  @doc """
  Generate a location_update.
  """
  def location_update_fixture(attrs \\ %{}, user) do
    {:ok, location_update} =
      attrs
      |> validate_location_update_attribute(user)
      |> LocStream.Locations.create_location_update()
    location_update
  end
end
