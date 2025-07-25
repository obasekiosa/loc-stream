defmodule LocStream.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      LocStreamWeb.Telemetry,
      LocStream.Repo,
      {DNSCluster, query: Application.get_env(:loc_stream, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: LocStream.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: LocStream.Finch},
      # Start a worker by calling: LocStream.Worker.start_link(arg)
      # {LocStream.Worker, arg},
      # Start to serve requests, typically the last entry
      LocStreamWeb.Endpoint
    ]

    children = if Application.get_env(:loc_stream, :env) == :test do
        children ++ [{LocStream.NumberAgent, 0}]
      else
        children
      end

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: LocStream.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    LocStreamWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
