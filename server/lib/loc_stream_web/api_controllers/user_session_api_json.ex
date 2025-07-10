defmodule LocStreamWeb.UserSessionApiJSON do
  use LocStreamWeb, :controller

  def create(%{refresh_token: refresh, jwt: jwt, client_id: client_id}) do
    %{status: "ok", refresh_token: refresh, jwt: jwt, client_id: client_id}
  end

  def update(params) do
    %{status: "ok_update"}
  end

  def delete(params) do
    %{status: "ok_delete"}
  end

  def register(params) do
    %{status: "ok"}
  end

  def error(%{errors: errors}) do
    %{status: "error", errors: errors}
  end
end
