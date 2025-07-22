defmodule LocStreamWeb.LocationSyncChannel do
  use LocStreamWeb, :channel

  alias LocStream.Locations
  alias LocStream.Locations.LocationUpdate

  @impl true
  def join("location:user:" <> id, _payload, %{assigns: %{user_id: user_id}}=socket) when user_id == id, do: {:ok, socket}
  def join(_, _, _), do: {:error, %{reason: "Unauthorized"}}

  ## todo: maybe make async, would require a return request id, maybe, client-id_recorded_at
  @impl true
  def handle_in("loc_sync_single", payload, socket) do
    case Locations.create_location_update(Map.put(payload, "user_id", socket.assigns.user_id)) do
      {:ok, update} -> {:reply, {:ok, %{"data" => LocationUpdate.to_json(update)}}, socket}
      {:error, changeset} -> {:reply, {:error, %{errors: Utils.format_errors(changeset)}}, socket}
    end
  end
end
