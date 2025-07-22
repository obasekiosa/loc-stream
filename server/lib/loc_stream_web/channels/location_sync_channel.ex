defmodule LocStreamWeb.LocationSyncChannel do
  use LocStreamWeb, :channel

  @impl true
  def join("location:user:" <> id, _payload, %{assigns: %{user_id: user_id}}=socket) when user_id == id, do: {:ok, socket}
  def join(_, _, _), do: {:error, %{reason: "unauthorized"}}

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (location_sync:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end
end
