defmodule LocStreamWeb.UserRegistrationController do
  use LocStreamWeb, :controller

  alias LocStream.Accounts
  alias LocStream.Accounts.User
  alias LocStreamWeb.UserAuth

  def new(conn, _params) do
    changeset = Accounts.change_user_registration(%User{})
    render(conn, :new, changeset: changeset)
  end

  def create(conn, %{"user" => user_params}) do
    case Accounts.register_user(user_params) do
      {:ok, user} ->
        {:ok, _} =
          Accounts.deliver_user_confirmation_instructions(
            user,
            &url(~p"/users/confirm/#{&1}")
          )

        conn
        |> put_flash(:info, "User created successfully.")
        |> UserAuth.log_in_user(user)

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end
end
