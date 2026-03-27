import polars as pl
import argparse

def convert_csv_to_parquet(csv_fp: str, parquet_fp: str) -> bool:
    """
    Converts a given CSV file to Parquet format.

    Args:
    - csv_fp (str): The file path of the input CSV file.
    - parquet_fp (str): The file path to save the generated Parquet file to.

    Returns:
    - (bool): True iff everything is successful.
    """

    try:
        df = pl.read_csv(csv_fp, try_parse_dates=True)
        # TODO: put in good schema overrides

        df.write_parquet(parquet_fp)
        # is there a better row group size? page size could maybe be larger??
    except Exception as e:
        print(f"An error occurred: {e}")
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description="Generate a Parquet file from a CSV file.")
    parser.add_argument("--csv", type=str, required=True)
    parser.add_argument("--par", type=str, required=True)
    args = parser.parse_args()
    if convert_csv_to_parquet(args.csv, args.par):
        print("Conversion successful!")

if __name__ == "__main__":
    main()
