defmodule LocStreamWeb.LocationSyncChannelTest do
  use LocStreamWeb.ChannelCase
  alias LocStream.AccountsFixtures
  alias LocStreamWeb.UserSocket
  alias LocStreamWeb.LocationSyncChannel

  @token "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJsb2Mtc3RyZWFtIiwiY2xpZW50X2lkIjoiMmMwNjBiZmUtYjA2YS00MjllLTkzMjMtODM1ZjlhYmM2YzU2IiwiZXhwIjoxNzUzMTczOTA3LCJpYXQiOjE3NTMxNzMwMDcsImlzcyI6ImxvYy1zdHJlYW0iLCJzdWIiOiJiMmU0Yzg0YS0yOTM4LTQ4ODMtOWVjNy1hOGNmZGI3MThjZTIiLCJ1c2VybmFtZSI6InNla2kifQ.m-B_rOXYmlDvEmp3MfrlyOy1cDp_gzpqMSvjeruazIg_2WyZjeXe0mgiT1SwiyiJNk6Doa_fXSD5D9trsP_4UQ"
  @user_id "b2e4c84a-2938-4883-9ec7-a8cfdb718ce2"
  setup do

    ## register user
    ## get api token and user id from token

    # build socket
    with {:ok, socket} <- connect(UserSocket, %{token: @token}),
          {:ok, _, socket} <- subscribe_and_join(socket, LocationSyncChannel, "location:user:#{@user_id}") do
      %{socket: socket}
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

  test "ping replies with status ok", %{socket: socket} do
    ref = push(socket, "ping", %{"hello" => "there"})
    assert_reply ref, :ok, %{"hello" => "there"}
  end

  test "shout broadcasts to location:user:<user_id>", %{socket: socket} do
    push(socket, "shout", %{"hello" => "all"})
    assert_broadcast "shout", %{"hello" => "all"}
  end

  test "broadcasts are pushed to the client", %{socket: socket} do
    broadcast_from!(socket, "broadcast", %{"some" => "data"})
    assert_push "broadcast", %{"some" => "data"}
  end
end
