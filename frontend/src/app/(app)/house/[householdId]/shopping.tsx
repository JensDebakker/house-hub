import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Module } from '@/components/Module';
import { getErrorMessage } from '@/lib/api';
import {
  useAddShoppingListItemMutation,
  useCreateShoppingListMutation,
  useRemoveShoppingListItemMutation,
  useShoppingListsQuery,
  useUpdateShoppingListItemMutation,
} from '@/lib/useShoppingLists';

const DEFAULT_LIST_NAME = 'Shopping List';
const SHOPPING_COLOR = '#059669';

export default function ShoppingScreen() {
  const { householdId } = useLocalSearchParams<{ householdId: string }>();

  const shoppingListsQuery = useShoppingListsQuery(householdId);
  const createList = useCreateShoppingListMutation(householdId);
  const addItem = useAddShoppingListItemMutation(householdId);
  const updateItem = useUpdateShoppingListItemMutation(householdId);
  const removeItem = useRemoveShoppingListItemMutation(householdId);

  const [label, setLabel] = useState('');

  const activeList = shoppingListsQuery.data?.[0];

  useEffect(() => {
    if (shoppingListsQuery.data && shoppingListsQuery.data.length === 0 && !createList.isPending) {
      createList.mutate({ name: DEFAULT_LIST_NAME });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingListsQuery.data]);

  const addShoppingItem = () => {
    if (!label.trim() || !activeList) return;
    addItem.mutate({ listId: activeList.id, request: { label: label.trim(), checked: false } });
    setLabel('');
  };

  const toggleItem = (itemId: string, checked: boolean, itemLabel: string) => {
    if (!activeList) return;
    updateItem.mutate({ listId: activeList.id, itemId, request: { label: itemLabel, checked: !checked } });
  };

  const deleteItem = (itemId: string) => {
    if (!activeList) return;
    removeItem.mutate({ listId: activeList.id, itemId });
  };

  const errorMessage = shoppingListsQuery.isError
    ? getErrorMessage(shoppingListsQuery.error, 'Failed to load shopping list.')
    : createList.isError
      ? getErrorMessage(createList.error, 'Failed to create shopping list.')
      : addItem.isError
        ? getErrorMessage(addItem.error, 'Failed to add item.')
        : updateItem.isError
          ? getErrorMessage(updateItem.error, 'Failed to update item.')
          : removeItem.isError
            ? getErrorMessage(removeItem.error, 'Failed to remove item.')
            : null;

  const isLoading = shoppingListsQuery.isLoading || (shoppingListsQuery.data?.length === 0 && createList.isPending);

  return (
    <Module title="Shopping List" color={SHOPPING_COLOR} scroll={false}>
      {errorMessage ? <Text style={{ color: '#c62828' }}>{errorMessage}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          placeholder="Add an item…"
          value={label}
          onChangeText={setLabel}
          onSubmitEditing={addShoppingItem}
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 }}
        />
        <Pressable
          onPress={addShoppingItem}
          disabled={addItem.isPending || !activeList}
          style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 12, justifyContent: 'center', opacity: addItem.isPending || !activeList ? 0.6 : 1 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Add</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={activeList?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingTop: 8 }}
          ListEmptyComponent={<Text style={{ color: '#999' }}>List is empty.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => toggleItem(item.id, item.checked, item.label)}
              onLongPress={() => deleteItem(item.id)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 8,
                backgroundColor: item.checked ? '#ecfdf5' : '#f3f4f6',
              }}
            >
              <Text style={{ textDecorationLine: item.checked ? 'line-through' : 'none' }}>
                {item.label}
              </Text>
              <Text style={{ color: '#999' }}>{item.checked ? '✓' : ''}</Text>
            </Pressable>
          )}
        />
      )}
    </Module>
  );
}
