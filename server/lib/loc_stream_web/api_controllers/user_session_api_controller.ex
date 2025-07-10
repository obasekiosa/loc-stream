defmodule LocStreamWeb.UserSessionApiController do
  use LocStreamWeb, :controller

  alias LocStreamWeb.Validators.UserSessionApiValidator, as: Validator
  alias LocStreamWeb.UserAuth
  alias LocStream.Accounts

  def create(conn, params) do
    case Validator.validate_log_in_request(params) do
      {:error, changeset} -> render_bad_request(conn, changeset)

      {:ok, request} ->
        case Accounts.get_user_by_username_and_password(request[:username], request[:password]) do
          nil -> conn |> put_status(:not_found) |> render(:error, errors: ["user not found"])
          user ->
            {refresh_token, jwt} = UserAuth.log_in_user_api(conn, user, request[:client_id])
            render(conn, :create, model: %{refresh_token: refresh_token, jwt: jwt, client_id: request[:client_id]})
        end
    end
  end

  defp render_bad_request(conn, changeset) do
    conn
    |> put_status(:bad_request)
    |> render(:error, errors: Validator.format_errors(changeset))
  end

  def register(conn, _params) do
    render(conn, :register, name: "up")
  end

  def update(conn, params) do
    case Validator.validate_refresh_request(params) do
      {:error, changeset} -> render_bad_request(conn, changeset)

      {:ok, request} ->
        case UserAuth.renew_access_token(conn, request[:refresh_token], request[:client_id]) do
          nil -> render_unauthorized(conn)
          {refresh_token, jwt} -> render(conn, :update, model: %{refresh_token: refresh_token, jwt: jwt, client_id: request[:client_id]})
        end
    end
  end

  defp render_unauthorized(conn) do
    conn
    |> put_status(:unauthorized)
    |> render(:error, errors: ["unauthorized"])
  end

  def delete(conn, params) do
    case Validator.validate_log_out_request(params) do
      {:error, changeset} -> render_bad_request(conn, changeset)

      {:ok, request} ->
        case UserAuth.log_out_api(conn, request[:refresh_token], request[:client_id]) do
          {:error, _} -> render_unauthorized(conn)
          {:ok, token_struct} -> render(conn, :delete, model: %{client_id: token_struct.sent_to})
        end
    end
  end
end
