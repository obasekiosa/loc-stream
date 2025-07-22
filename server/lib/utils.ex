defmodule Utils do
  import Ecto.Changeset

  def format_errors(changeset) do
    traverse_errors(changeset, fn {msg, opts} ->
      # Replace placeholders like %{count}
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        if is_list(value) do
          acc ## todo: convert list to string and use in replace function below
        else
          String.replace(acc, "%{#{key}}", to_string(value))
        end
      end)
    end)
  end
end
