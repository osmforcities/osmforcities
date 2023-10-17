import click
import geopandas as gpd
import requests
from pathlib import Path
from joblib import Parallel, delayed
from tqdm import tqdm

GEO_BOUNDARIES_URL = "https://www.geoboundaries.org/gbRequest.html?ISO"


def check_iso(iso3: str):
    try:
        r = requests.get(f"{GEO_BOUNDARIES_URL}={iso3}")
        return r.json()
    except Exception as ex:
        print("data not found for ISO")
        print(ex)
        return []


def download_data_country(data_country, data_path):
    # create folder
    boundary_iso = data_country.get("boundaryISO", "")
    boundary_type = data_country.get("boundaryType", "")
    try:
        Path(f"{data_path}/{boundary_iso}/boundary").mkdir(exist_ok=True, parents=True)
        # download data
        gdf = gpd.read_file(data_country.get("gjDownloadURL", ""))
        gdf["shapeName"] = gdf["shapeName"].apply(
            lambda x: str(x).lower().strip().replace(" ", "_")
        )
        gdf.to_file(
            f"{data_path}/{boundary_iso}/boundary/{boundary_iso}_{boundary_type}.geojson",
            driver="GeoJSON",
        )
        return {
            "name": f"{boundary_iso}_{boundary_type}",
            "status": 200,
        }
    except Exception:
        return {
            "name": f"{boundary_iso}_{boundary_type}",
            "status": 404,
        }


@click.command("Download geo boundaries")
@click.option(
    "--iso_countries", help="Country iso3", type=str, required=True, multiple=True
)
@click.option("--data_path", help="Data output path", type=str, default="./data")
def run(iso_countries: list, data_path):
    iso_countries = [i.upper().strip() for i in iso_countries]
    # check iso
    countries_data = []
    for iso_country in tqdm(iso_countries, desc="Get metadata"):
        countries_data = [*countries_data, *check_iso(iso_country)]

    data_status = Parallel(n_jobs=-1)(
        delayed(download_data_country)(data_country, data_path)
        for data_country in tqdm(countries_data, desc=f"Download data")
    )
    print("=" * 20)
    print("STATUS")
    print("=" * 20)

    for ds in data_status:
        print(ds.get("name"), ds.get("status"))


if __name__ == "__main__":
    run()
