defmodule LocStreamWeb.UserSessionApiJSON do
  use LocStreamWeb, :controller

  def create(%{model: model}) do
    Map.put(model, :status, "ok")
  end

  def update(%{model: model}) do
    Map.put(model, :status, "ok")
  end

  def delete(%{model: model}) do
    Map.put(model, :status, "ok")
  end

  def register(%{model: model}) do
    Map.put(model, :status, "ok")
  end

  def error(%{errors: errors}) do
    %{status: "error", errors: errors}
  end
end
