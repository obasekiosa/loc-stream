defmodule LocStream.NumberAgent do
  use Agent

  def start_link(initial_number) when is_integer(initial_number) do ## todo: update so name opts can be passed down from supervisor
    Agent.start_link(fn -> initial_number end, name: __MODULE__)
  end

  def init(initial_number) when is_integer(initial_number) do
    {:ok, initial_number}
  end

  def get_number(pid_or_name \\ __MODULE__) do
    val = Agent.get(pid_or_name, fn number -> number end)
    increment(pid_or_name)
    val
  end

  defp increment(pid_or_name) do
    Agent.update(pid_or_name, fn number -> number + 1 end)
  end

  def increment_by(pid_or_name \\ __MODULE__, amount) when is_integer(amount) do
    Agent.update(pid_or_name, fn number -> number + amount end)
  end

  def stop(pid_or_name \\ __MODULE__) do
    Agent.stop(pid_or_name)
  end
end
