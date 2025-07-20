defmodule LocStream.Locations do
  @moduledoc """
  The Locations context.
  """

  import Ecto.Query, warn: false
  alias LocStream.Repo

  alias LocStream.Locations.LocationUpdate

  @doc """
  Returns the list of locations.

  ## Examples

      iex> list_locations()
      [%LocationUpdate{}, ...]

  """
  def list_locations do
    Repo.all(LocationUpdate)
  end

  @doc """
  Gets a single location_update.

  Raises `Ecto.NoResultsError` if the Location update does not exist.

  ## Examples

      iex> get_location_update!(123)
      %LocationUpdate{}

      iex> get_location_update!(456)
      ** (Ecto.NoResultsError)

  """
  def get_location_update!(id), do: Repo.get!(LocationUpdate, id)

  @doc """
  Creates a location_update.

  ## Examples

      iex> create_location_update(%{field: value})
      {:ok, %LocationUpdate{}}

      iex> create_location_update(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_location_update(attrs \\ %{}) do
    %LocationUpdate{}
    |> LocationUpdate.changeset(attrs)
    |> Repo.insert()
  end


  def batch_create_location_update(list_of_attrs, opts \\ []) when is_list(list_of_attrs) do
    # Repo.insert_all is highly efficient for bulk inserts.
    # It bypasses changesets, so ensure your input data is clean and valid beforehand.
    # You might want to add a validation step here if `list_of_attrs` can be untrusted.
    ## validate each attr
    ## maybe insert all valid updates
    ## return all valid inserts ids and all invalid sync attrs
    {valid_updates, invalid_updates} = LocationUpdate.batch_changeset(list_of_attrs)
    case valid_updates do
      [] -> {0, [], invalid_updates}
      update_lists ->
        should_insert_valids_if_invalids_exist = Keyword.get(opts, :try_with_invalids, true)
        if should_insert_valids_if_invalids_exist do
          {insert_count, values} = Repo.insert_all(LocationUpdate, update_lists, returning: [:id, :inserted_at])
          {insert_count, values, invalid_updates}
        else
          {0, [], invalid_updates}
        end
    end

  end

  @doc """
  Retrieves location updates for a specific user, ordered chronologically.

  ## Options:
    * `:limit` - Maximum number of records to return (default: 100)
    * `:offset` - Offset for pagination (default: 0)
    * `:order_by` - Field to order by (default: :recorded_at)
    * `:order_direction` - `:asc` or `:desc` (default: :desc for latest first)
  """
  def list_location_updates_for_user(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 100) ## todo restrict the limit to 100
    offset = Keyword.get(opts, :offset, 0)
    order_by_field = Keyword.get(opts, :order_by, :recorded_at)
    order_direction = Keyword.get(opts, :order_direction, :desc)

    LocationUpdate
    |> where(user_id: ^user_id)
    |> order_by([{^order_direction, ^order_by_field}])
    |> limit(^limit)
    |> offset(^offset)
    |> Repo.all()
  end

   @doc """
  Retrieves the single latest location update for a given user.
  """
  def get_latest_location_for_user(user_id) do
    LocationUpdate
    |> where(user_id: ^user_id)
    |> order_by(desc: :recorded_at)
    |> limit(1)
    |> Repo.one()
  end


  @doc """
  Updates a location_update.

  ## Examples

      iex> update_location_update(location_update, %{field: new_value})
      {:ok, %LocationUpdate{}}

      iex> update_location_update(location_update, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_location_update(%LocationUpdate{} = location_update, attrs) do
    location_update
    |> LocationUpdate.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a location_update.

  ## Examples

      iex> delete_location_update(location_update)
      {:ok, %LocationUpdate{}}

      iex> delete_location_update(location_update)
      {:error, %Ecto.Changeset{}}

  """
  def delete_location_update(%LocationUpdate{} = location_update) do
    Repo.delete(location_update)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking location_update changes.

  ## Examples

      iex> change_location_update(location_update)
      %Ecto.Changeset{data: %LocationUpdate{}}

  """
  def change_location_update(%LocationUpdate{} = location_update, attrs \\ %{}) do
    LocationUpdate.changeset(location_update, attrs)
  end
end
