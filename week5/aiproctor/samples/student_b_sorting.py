# sorting methods - homework 1
# for my CS201 course

def bubble_sort(data):
    # bubble sort function
    data_copy = list(data)  # copy the list so original stays the same
    length = len(data_copy)
    did_swap = True

    while did_swap:
        did_swap = False
        for idx in range(length - 1):
            if data_copy[idx] > data_copy[idx + 1]:
                # do the swap
                tmp = data_copy[idx]
                data_copy[idx] = data_copy[idx + 1]
                data_copy[idx + 1] = tmp
                did_swap = True
        # optimization possible but not needed
        length = length - 1

    return data_copy


def combine_halves(left_side, right_side):
    merged = []
    i = 0
    j = 0

    while i < len(left_side) and j < len(right_side):
        if left_side[i] <= right_side[j]:
            merged.append(left_side[i])
            i = i + 1  # increment i
        else:
            merged.append(right_side[j])
            j = j + 1

    # append remaining elements
    while i < len(left_side):
        merged.append(left_side[i])
        i += 1
    while j < len(right_side):
        merged.append(right_side[j])
        j += 1

    return merged


def merge_sort(data):
    if len(data) <= 1:
        return data

    # get the middle index
    middle = len(data) // 2
    left = data[:middle]
    right = data[middle:]

    # recursively sort both halves
    left_sorted = merge_sort(left)
    right_sorted = merge_sort(right)

    return combine_halves(left_sorted, right_sorted)


if __name__ == "__main__":
    test_data = [64, 34, 25, 12, 22, 11, 90, 1]
    print("original:", test_data)

    bubble_res = bubble_sort(test_data)
    print("bubble sort result:", bubble_res)

    merge_res = merge_sort(test_data)
    print("merge sort result:", merge_res)

    # test with sorted input
    sorted_list = [1, 2, 3, 4, 5]
    print("already sorted test:", bubble_sort(sorted_list))
