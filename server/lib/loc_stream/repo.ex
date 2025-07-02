defmodule LocStream.Repo do
  use Ecto.Repo,
    otp_app: :loc_stream,
    adapter: Ecto.Adapters.Postgres
end
