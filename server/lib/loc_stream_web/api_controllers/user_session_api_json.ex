defmodule LocStreamWeb.UserSessionApiJSON do
  use LocStreamWeb, :controller

  def create(%{refresh_token: refresh, jwt: jwt}) do
    %{status: "ok", refresh_token: refresh, jwt: jwt}
  end

  def update(params) do
    %{status: "ok_update"}
  end

  def delete(params) do
    %{status: "ok_delete"}
  end

  def error(%{errors: errors}) do
    %{status: "error", errors: errors}
  end
end
