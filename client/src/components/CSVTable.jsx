import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'

function CSVTable() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch('/resultados.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = Papa.parse(text, { header: true })
        setData(parsed.data)
      })
  }, [])

  return (
    <div>
      <h1>Resultados históricos del Melate</h1>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Concurso</th>
            <th>R1</th><th>R2</th><th>R3</th><th>R4</th><th>R5</th><th>R6</th><th>R7</th>
            <th>Bolsa</th><th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.CONCURSO}</td>
              <td>{row.R1}</td><td>{row.R2}</td><td>{row.R3}</td><td>{row.R4}</td>
              <td>{row.R5}</td><td>{row.R6}</td><td>{row.R7}</td>
              <td>{row.BOLSA}</td><td>{row.FECHA}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CSVTable