defmodule GeneralStore.Item do
  @type t :: %__MODULE__{
    name: String.t(),
    display: String.t(),
    price: float()
  }
  defstruct [:name, :display, :price]
end

defmodule GeneralStore.Items do
  @food_items [
    %GeneralStore.Item{name: "bacon", display: "Bacon (lbs)", price: 1.0},
    %GeneralStore.Item{name: "beans", display: "Beans (dry, lbs)", price: 0.5},
    %GeneralStore.Item{name: "candy", display: "Candy (lbs)", price: 0.25},
    %GeneralStore.Item{name: "coffee", display: "Coffee (lbs)", price: 1.0},
    %GeneralStore.Item{name: "cornmeal", display: "Cornmeal (lbs)", price: 0.5},
    %GeneralStore.Item{name: "flour", display: "Flour (lbs)", price: 0.5},
    %GeneralStore.Item{name: "fruit", display: "Fruit (lbs)", price: 0.5},
    %GeneralStore.Item{name: "hardtack", display: "Hardtack (lbs)", price: 0.25},
    %GeneralStore.Item{name: "lard", display: "Lard (lbs)", price: 0.5},
    %GeneralStore.Item{name: "molasses", display: "Molasses (lbs)", price: 0.5},
    %GeneralStore.Item{name: "salt", display: "Salt (lbs)", price: 0.25},
    %GeneralStore.Item{name: "sugar", display: "Sugar (lbs)", price: 0.5}
  ]

  @equipment_items [
    %GeneralStore.Item{name: "axes", display: "Axes", price: 5.0},
    %GeneralStore.Item{name: "cookware", display: "Cookware", price: 5.0},
    %GeneralStore.Item{name: "firearms", display: "Firearms", price: 5.0},
    %GeneralStore.Item{name: "knives", display: "Knives", price: 5.0},
    %GeneralStore.Item{name: "rope", display: "Rope", price: 5.0},
    %GeneralStore.Item{name: "saddles", display: "Saddles", price: 5.0},
  ]

  @consumable_items [
    %GeneralStore.Item{name: "ammunition", display: "Ammunition", price: 2.0},
    %GeneralStore.Item{name: "candles", display: "Candles", price: 2.0},
    %GeneralStore.Item{name: "fabric", display: "Fabric", price: 2.0},
    %GeneralStore.Item{name: "kerosene", display: "Kerosene", price: 2.0},
    %GeneralStore.Item{name: "medicine", display: "Medicine", price: 2.0},
    %GeneralStore.Item{name: "soap", display: "Soap", price: 2.0},
    %GeneralStore.Item{name: "tobacco", display: "Tobacco", price: 2.0}
  ]

  def get_food_items, do: @food_items
  def get_equipment_items, do: @equipment_items
  def get_consumable_items, do: @consumable_items
end
