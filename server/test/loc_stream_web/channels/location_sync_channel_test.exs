defmodule LocStreamWeb.LocationSyncChannelTest do
  use LocStreamWeb.ChannelCase
  use LocStreamWeb, :verified_routes

  require Phoenix.ConnTest
  alias LocStream.Accounts.User
  alias LocStream.AccountsFixtures
  alias LocStream.LocationsFixtures
  alias LocStreamWeb.UserSocket
  alias LocStreamWeb.LocationSyncChannel

  alias Phoenix.ConnTest

  setup do

    conn = Phoenix.ConnTest.build_conn()
    register_user_req = AccountsFixtures.valid_user_attributes()
    conn = ConnTest.post(conn, ~p"/api/auth/register", register_user_req)
    register_user_resp = ConnTest.json_response(conn, 200)

    log_in_request =
      Map.take(register_user_resp, ["username", "client_id"])
      |> Map.put("password", register_user_req[:password])

    conn = ConnTest.post(conn, ~p"/api/auth/log_in", log_in_request)
    login_user_resp = ConnTest.json_response(conn, 200)

    token = login_user_resp["jwt"]
    user_id = register_user_resp["user_id"]
    client_id = register_user_resp["client_id"]

    # build socket
    with {:ok, socket} <- connect(UserSocket, %{token: token}),
          {:ok, _, socket} <- subscribe_and_join(socket, LocationSyncChannel, "location:user:#{user_id}") do
      %{socket: socket, user_id: user_id, client_id: client_id}
    else
      {:error, reason} -> raise reason
    end
  end

  # test socket can authenticate
  # test socket id is correct
  # test channel can autheticate
  # test messages and associated functionality
  # test channel is unauthenticated after token expiry
  # test joining channel location:user:<user_id> for a different user_id is unauthorized

  test "loc_sync_single replies with status ok", %{socket: socket, client_id: client_id, user_id: user_id} do
    loc_attr = LocationsFixtures.valid_location_update_attribute_no_user(%{client_id: client_id})
    ref = push(socket, "loc_sync_single", loc_attr)

    # expected = %{"recorded_at" => ^loc_attr[:recorded_at], "client_id" => ^loc_attr[:client_id], "user_id" => ^user_id, "latitude" => ^loc_attr[:latitude], "longitude" => ^loc_attr[:longitude], "id" => _, "inserted_at" => _, "updated_at" => _ }

    assert_reply ref, :ok, %{"data" => _}
  end

  test "shout broadcasts to location:user:<user_id>", %{socket: socket} do
    # push(socket, "shout", %{"hello" => "all"})
    # assert_broadcast "shout", %{"hello" => "all"}
  end

  test "broadcasts are pushed to the client", %{socket: socket} do
    # broadcast_from!(socket, "broadcast", %{"some" => "data"})
    # assert_push "broadcast", %{"some" => "data"}
  end
end
