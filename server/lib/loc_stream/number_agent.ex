defmodule LocStream.NumberAgent do
  use Agent

  @impl true
  def start_link(initial_number) when is_integer(initial_number) do
    Agent.start_link(fn -> initial_number end, name: __MODULE__)
  end

  @impl true
  def init(initial_number) when is_integer(initial_number) do
    {:ok, initial_number}
  end

  def get_number(pid_or_name \\ __MODULE__) do
    val = Agent.get(pid_or_name, fn number -> number end)
    increment(pid_or_name)
    val
  end

  defp increment(pid_or_name \\ __MODULE__) do
    Agent.update(pid_or_name, fn number -> number + 1 end)
  end

  def increment_by(pid_or_name \\ __MODULE__, amount) when is_integer(amount) do
    Agent.update(pid_or_name, fn number -> number + amount end)
  end

  @impl true
  def stop(pid_or_name \\ __MODULE__) do
    Agent.stop(pid_or_name)
  end
end
