#Paylots

## para encontrar headers

https://api.flowsma.com/donandres/flowfactores/getRegistroCabFieldListForSelect/1692

```json
data: {"data":{
    "auditorid":"auditorid",
    "clientid":"Cliente Id",
    "clientname":"Cliente Nombre",
    "creationdate":"creationdate",
    "descrip":"Descripci\u00f3n",
    "ejecutorid":"ejecutorid",
    "fecha":"Fecha",
    "fechacompromiso":"Fecha Compromiso",
    "id":"id",
    "procesoid":"procesoid",
    "referenciatexto":"referenciatexto",
    "totalimpuestos":"Total impuesto",
    "totalprecio":"TOTAL",
    "vendedorid":"Vendedor Id",
    "obsadm":"obsadm",
    "obsventas":"obsventass"}}
```

## update headers

https://api.flowsma.com/donandres/rowConfig/update
data: {
"tipo": "cols-registrocab-modal",
"jsondata": "[\"auditorid\",\"clientid\",\"clientname\",\"creationdate\",\"descrip\",\"ejecutorid\",\"fecha\",\"fechacompromiso\",\"id\",\"parteinteresadatipo\",\"procesoid\",\"puestotrabajo\",\"referenciatexto\",\"totalimpuestos\",\"totalprecio\",\"vendedorid\"]"
}
