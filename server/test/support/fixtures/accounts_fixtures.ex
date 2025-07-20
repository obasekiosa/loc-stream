defmodule LocStream.AccountsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `LocStream.Accounts` context.
  """

  alias LocStream.NumberAgent

  def unique_user_email(n \\ nil), do: "user#{n || NumberAgent.get_number()}@example.com"
  def valid_user_password(n \\ nil), do: "#{n || NumberAgent.get_number()}_Hello_world!"
  def unique_user_username(n \\ nil), do: "user#{n || NumberAgent.get_number()}"

  def valid_user_attributes(attrs \\ %{}) do
    number = NumberAgent.get_number()
    Enum.into(attrs, %{
      email: unique_user_email(number),
      username: unique_user_username(number),
      password: valid_user_password(number)
    })
  end

  def user_fixture(attrs \\ %{}) do
    {:ok, user} =
      attrs
      |> valid_user_attributes()
      |> LocStream.Accounts.register_user()

    user
  end

  def extract_user_token(fun) do
    {:ok, captured_email} = fun.(&"[TOKEN]#{&1}[TOKEN]")
    [_, token | _] = String.split(captured_email.text_body, "[TOKEN]")
    token
  end
end
