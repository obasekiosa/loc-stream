defmodule LocStream.LocationsTest do
  use LocStream.DataCase

  alias LocStream.Locations

  alias LocStream.Locations.LocationUpdate

  import LocStream.LocationsFixtures
  import LocStream.AccountsFixtures

  describe "locations" do
    @invalid_attrs %{}

    setup do
      user = user_fixture()
      %{user: user, location_update: location_update_fixture(user)}
    end

    test "list_locations/0 returns all locations", %{location_update: location_update} do
      assert Locations.list_locations() == [location_update]
    end

    test "get_location_update!/1 returns the location_update with given id", %{location_update: location_update} do
      assert Locations.get_location_update!(location_update.id) == location_update
    end

    test "create_location_update/1 with valid data creates a location_update", %{user: user} do
      valid_attrs = validate_location_update_attribute(user)
      assert {:ok, %LocationUpdate{} = _} = Locations.create_location_update(valid_attrs)
    end

    test "create_location_update/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Locations.create_location_update(@invalid_attrs)
    end

    test "delete_location_update/1 deletes the location_update", %{location_update: location_update} do
      assert {:ok, %LocationUpdate{}} = Locations.delete_location_update(location_update)
      assert_raise Ecto.NoResultsError, fn -> Locations.get_location_update!(location_update.id) end
    end

    test "change_location_update/1 returns a location_update changeset", %{ location_update: location_update } do
      assert %Ecto.Changeset{} = Locations.change_location_update(location_update)
    end
  end
end
