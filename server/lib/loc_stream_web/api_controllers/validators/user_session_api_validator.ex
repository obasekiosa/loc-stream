defmodule LocStreamWeb.Validators.UserSessionApiValidator do
  import Ecto.Changeset
  alias Ecto.Changeset

  @login_request_schema %{
    username: :string,
    password: :string,
    client_id: :string
  }


  def validate_log_in_request(params, opts \\ []) do
    {%{}, @login_request_schema}
    |> cast(params, Map.keys(@login_request_schema))
    |> validate_required([:username, :password])
    |> maybe_generate_client_id(opts)
    |> apply_action(:validate)
  end

  defp maybe_generate_client_id(%Changeset{changes: %{client_id: _}}=changeset, _), do: changeset

  defp maybe_generate_client_id(changeset, opts) do
    if Keyword.get(opts, :generate_client_id, true) do
      put_change(changeset, :client_id, Ecto.UUID.generate())
    else
      changeset
    end
  end


  @refresh_request_schema %{
    refresh_token: :string,
    client_id: :string,
  }

  def validate_refresh_request(params, _opts \\ []) do
    {%{}, @refresh_request_schema}
    |> cast(params, Map.keys(@refresh_request_schema))
    |> validate_required([:refresh_token, :client_id])
    |> apply_action(:validate)
  end

  def format_errors(changeset) do
    traverse_errors(changeset, fn {msg, opts} ->
      # Replace placeholders like %{count}
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end

end
