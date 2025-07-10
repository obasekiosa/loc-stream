defmodule LocStreamWeb.UserSessionApiController do
  use LocStreamWeb, :controller

  alias LocStreamWeb.Validators.UserSessionApiValidator, as: Validator
  alias LocStreamWeb.UserAuth
  alias LocStream.Accounts

  def create(conn, params) do
    case Validator.validate_log_in_request(params) do
      {:error, changeset} -> conn |> put_status(:bad_request) |> render(:error, errors: Validator.format_errors(changeset))

      {:ok, request} ->
        case Accounts.get_user_by_username_and_password(request[:username], request[:password]) do
          nil -> conn |> put_status(:not_found) |> render(:error, errors: ["user not found"])
          user ->
            {refresh, jwt} = UserAuth.log_in_user_api(conn, user, request[:client_id])
            conn
            render(conn, :create, refresh_token: refresh, jwt: jwt)
        end
    end
  end

  def update(conn, params) do
    render(conn, :update, name: "up")
  end

  def delete(conn, params) do
    render(conn, :delete, name: "de")
  end
end
